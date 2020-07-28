parseGeoData = function(){

	// parse parent locations up to 4 levels
	dataEntries.forEach(function(d,i){
		d.geo.forEach(function(dd,ii){
			dd = parseInt(dd);
			var parents = [];
			var parent = getParent(dd);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			var parent = getParent(parent);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			var parent = getParent(parent);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			var parent = getParent(parent);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			d.geo.push.apply(d.geo,parents);
		});

	});

	dataAssessments.forEach(function(d,i){
		d.geo.forEach(function(dd,ii){
			dd = parseInt(dd);
			var parents = [];
			var parent = getParent(dd);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			var parent = getParent(parent);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			var parent = getParent(parent);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			var parent = getParent(parent);
			if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
				parents.push(parent);
			}
			d.geo.push.apply(d.geo,parents);
		});
	});

	// remove unused locations
	var locationArray = [];
	dataAssessments.forEach(function(d,i){
		d.geo.forEach(function(dd,ii){
			if(!locationArray.includes(parseInt(dd))){
				locationArray.push(parseInt(dd));
			}
		})
	});

	dataEntries.forEach(function(d,i){
		d.geo.forEach(function(dd,ii){
			if(!locationArray.includes(parseInt(dd))){
				locationArray.push(parseInt(dd));
			}
		})
	});

	var newGeoArray = [];
	metadata.geo_array.forEach(function(d,i,obj){
		if(locationArray.includes(parseInt(d.id))){
			newGeoArray.push(d);
		}	
	})

	metadata.geo_array = newGeoArray;

	metadata.geo_array.sort(function(x, y){
	   return d3.ascending(x.name, y.name);
	});

	metadata.geo_json = {"type": "FeatureCollection", "features": []};
	metadata.geo_json_point = {"type": "FeatureCollection", "features": []};

	metadata.geo_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		var polygons = d.polygons;
		polygons.coordinates = polygons.coordinates;
		var feature = {'type':'Feature', 'properties':{'name': d.name, 'id': d.id, 'admin_level': d.admin_level}, 'geometry': polygons }
		metadata.geo_json.features[i] = feature;
		var point = { "type": "Point", "coordinates": [ d.centroid[0],d.centroid[1],0.0 ] }
		var featurePoint = {'type':'Feature', 'properties':{'name': d.name, 'id': d.id, 'admin_level': d.admin_level}, 'geometry': point }
		metadata.geo_json_point.features[i] = featurePoint;
	});

	metadata.geo_json.features.forEach(function(feature) {
	   if(feature.geometry.type == "MultiPolygon") {
	     feature.geometry.coordinates.forEach(function(polygon) {
	       polygon.forEach(function(ring) {
	         ring.reverse();
	       })
	     })
	   }
	   else if (feature.geometry.type == "Polygon") {
	     feature.geometry.coordinates.forEach(function(ring) {
	       ring.reverse();
	     })  
	   }
	 });
}

parseAssessmentsMetadata = function(metadata){
	// parse meta data, create integer id column from string ids and programattically attempt to shorten label names
	metadata.focus_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.data_collection_technique.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		if(d.name=='Focus Group Discussion') data_collection_technique_keys.focus_group_discussion = d.id;
		if(d.name=='Key Informant Interview') data_collection_technique_keys.key_informant_interview = d.id;
		if(d.name=='Community Group Discussion') data_collection_technique_keys.community_group_discussion = d.id;
	});

	metadata.type_of_unit_of_analysis.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.methodology_content.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.additional_documentation_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.language.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.assessment_type.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		if(d.name=='Initial') atype_keys.initial = d.id;
		if(d.name=='Rapid') atype_keys.rapid = d.id;
		if(d.name=='In-depth') atype_keys.in_depth = d.id;
		if(d.name=='Monitoring') atype_keys.monitoring = d.id;
	});

	metadata.sampling_approach.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.coordination.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		if(d.name=='Coordinated - Joint') coordinatedJointId = d.id;
		if(d.name=='Coordinated - Harmonized') coordinatedHarmonizedId = d.id;
		if(d.name=='Uncoordinated') uncoordinatedId = d.id;
	});

	metadata.affected_groups_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.sector_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	metadata.organization.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		d.name = d.short_name;
	});

	metadata.organization_type.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		if(d.name=='Donor') stakeholder_type_keys.donor = d.id;
		if(d.name=='International Organization') stakeholder_type_keys.ingo = d.id;
		if(d.name=='Non-governmental Organization') stakeholder_type_keys.lngo = d.id;
		if(d.name=='Government') stakeholder_type_keys.government = d.id;
		if(d.name=='UN Agency') stakeholder_type_keys.un_agency = d.id;
		if(d.name=='UN Agencies') stakeholder_type_keys.un_agency = d.id;
		if(d.name=='Red Cross/Red Crescent Movement') stakeholder_type_keys.rcrc = d.id;
		if(d.name=='Cluster') stakeholder_type_keys.cluster = d.id;
	});

	metadata.scorepillar_scale.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});

	return metadata;
}

parseAssessmentsData = function(data, metadata){
// PARSE ASSESSMENT DATA IDS
	data.forEach(function(d,i){
		d.date = new Date(d.date);
		d.date.setHours(0,0,0,0);
		d.month = new Date(d.date);
		d.month.setHours(0,0,0,0);
		d.month.setDate(1);
		d.year = new Date(d.date);
		d.year.setHours(0,0,0,0);
		d.year.setDate(1);
		d.year.setMonth(0);
		d.date_str = timeFormat(d.date);

		// PARSE STRING IDS TO INTEGERS
		// parse context array
		d._focus = d.focus;
		d.focus = [];
		d._focus.forEach(function(dd,ii){
			metadata.focus_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.focus.includes(ddd.id)) d.focus.push(ddd.id);
				}
			});
		});

		// parse affected groups array
		d._affected_groups = d.affected_groups;
		d.affected_groups = [];
		d._affected_groups.forEach(function(dd,ii){
			metadata.affected_groups_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.affected_groups.includes(ddd.id)) d.affected_groups.push(ddd.id);
				}
			});
		});

		// parse sector array
		d._sector = d.sector;
		d.sector = [];
		d._sector.forEach(function(dd,ii){
			metadata.sector_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.sector.includes(ddd.id)) d.sector.push(ddd.id);
				}
			});
		});

		d.sector_count = d.sector.length;

		// parse assessment type
		d._assessment_type = d.assessment_type;
		d.assessment_type_str = '';
		metadata.assessment_type.forEach(function(ddd,ii){
			if(parseInt(d._assessment_type)==parseInt(ddd._id)){
				d.assessment_type = parseInt(ddd.id);
				d.assessment_type_str = ddd.name;
			}
		});

		// parse coordination 
		d._coordination = d.coordination;
		d.coordination_str = '';
		metadata.coordination.forEach(function(ddd,ii){
			if(d._coordination==ddd._id){
				d.coordination = ddd.id;
				d.coordination_str = ddd.name;
			}
		});

		// parse language array
		d._language = d.language;
		d.language = [];
		if(d._language){
			d._language.forEach(function(dd,ii){
				metadata.language.forEach(function(ddd,ii){
					if(dd==ddd._id){
						if(!d.language.includes(ddd.id)) d.language.push(ddd.id);
					}
				});
			});		
		}

		// parse sampling_approach array
		d._sampling_approach = d.sampling_approach;
		d.sampling_approach = [];
		var sa = [];
		d._sampling_approach.forEach(function(dd,ii){
			metadata.sampling_approach.forEach(function(ddd,ii){
				if((dd==ddd._id)&&(!d.sampling_approach.includes(ddd.id))){
					if(!d.sampling_approach.includes(ddd.id)) d.sampling_approach.push(ddd.id);
				}
			});
		});

		// parse data collection technique 
		d._data_collection_technique = d.data_collection_technique;
		d.data_collection_technique = [];
		d._data_collection_technique.forEach(function(dd,ii){
			metadata.data_collection_technique.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.data_collection_technique.includes(ddd.id)) d.data_collection_technique.push(ddd.id);
				}
			});
		});

		// parse unit of analysis
		d._unit_of_analysis = d.unit_of_analysis;
		d.unit_of_analysis = [];
		d._unit_of_analysis.forEach(function(dd,ii){
			metadata.type_of_unit_of_analysis.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.unit_of_analysis.includes(ddd.id)) d.unit_of_analysis.push(ddd.id);
				}
			});
		});

		// parse unit of reporting
		d._unit_of_reporting = d.unit_of_reporting;
		d.unit_of_reporting = [];
		d._unit_of_reporting.forEach(function(dd,ii){
			metadata.type_of_unit_of_analysis.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.unit_of_reporting.includes(ddd.id)) d.unit_of_reporting.push(ddd.id);
				}
			});
		});

		// parse methodology content
		d._methodology_content = d.methodology_content;
		d.methodology_content = [];
		d._methodology_content.forEach(function(dd,ii){
			if(dd==1){
				if(!d.methodology_content.includes(metadata.methodology_content[ii])) d.methodology_content.push(metadata.methodology_content[ii])
			}
		});

		// parse additional documentation available 
		d._additional_documentation = d.additional_documentation;
		d.additional_documentation = [];
		d._additional_documentation.forEach(function(dd,ii){
			if(dd>=1){
				var doc = {'id': metadata.additional_documentation_array[ii].id, name: metadata.additional_documentation_array[ii].name, value: dd };
				if(!d.additional_documentation.includes(doc)) d.additional_documentation.push(doc)
			}
		});

		// parse analytical density sector keys
		d.scores._analytical_density = d.scores.analytical_density;
		d.scores.analytical_density = [];

		Object.entries(d.scores._analytical_density).forEach(function(dd,ii){
			var sector = dd[0];
			var value = dd[1];
			metadata.sector_array.forEach(function(ddd,ii){
				if(sector==ddd._id){
					var obj = {};
					obj.sector = ddd.id;
					obj.name = ddd.name;
					obj.value = value;
					d.scores.analytical_density.push(obj);
				}
			});
		});

		// parse organisations array
		d._organization_and_stakeholder_type = d.organization_and_stakeholder_type;
		d.organization_and_stakeholder_type = [];
		d.organization_str = [];
		d.stakeholder_type = [];
		d._organization_and_stakeholder_type.forEach(function(dd,ii){
			var orgId;
			var orgTypeId;
			metadata.organization.forEach(function(ddd,ii){
				if((dd[1]==ddd._id)&&(!d.organization_str.includes(ddd.short_name))){
					orgId = ddd.id;
					d.organization_str.push(ddd.short_name)

				}
			});
			metadata.organization_type.forEach(function(ddd,ii){
				if(dd[0]==ddd._id){
					orgTypeId = ddd.id;
				}
			});
			if(!d.organization_and_stakeholder_type.includes([orgTypeId, orgId])){
				d.organization_and_stakeholder_type.push([orgTypeId, orgId]);
			}
			if(!d.stakeholder_type.includes(orgTypeId)){
				d.stakeholder_type.push(orgTypeId);
			}
		});
		d.organization_str = (d.organization_str.join(", "));

		// parse scorepillar scale id
		d._scorepillar_scale = d.scorepillar_scale;
		metadata.scorepillar_scale.forEach(function(ddd,ii){
			if(d._scorepillar_scale==ddd._id){
				d.scorepillar_scale = ddd.id;
			}
			// parse null values
			if(d._scorepillar_scale===null){
				d.scorepillar_scale = 0;
			}
		});

		// parse geo id
		d._geo = d.geo;
		d.geo = [];
		d._geo.forEach(function(dd,ii){
			metadata.geo_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.geo.includes(ddd.id)){d.geo.push(ddd.id);};
					geoBounds.lat.push(ddd.bounds[0][0]);
					geoBounds.lat.push(ddd.bounds[1][0]);
					geoBounds.lon.push(ddd.bounds[0][1]);
					geoBounds.lon.push(ddd.bounds[1][1]);
				}
			});
		});

		var analytical_densityScore = d.scores.final_scores.score_matrix_pillar['1'];
		var scores = [];
		scores.push(analytical_densityScore);

		Object.keys(d.scores.final_scores.score_pillar).forEach(function(key,index) {
		    scores.push(d.scores.final_scores.score_pillar[key]);
		});

		var finalScore = d3.median(scores, function(md){
			return md;
		});

		d.final_score = finalScore;

		if(finalScore<=5){
			d.finalScore = 1;
		} else if(finalScore<=10){
			d.finalScore = 2;
		} else if(finalScore<=15){
			d.finalScore = 3;
		} else if(finalScore<=20){
			d.finalScore = 4;
		} else if (finalScore<=25){
			d.finalScore = 5;
		};

		d.top = [];

		if((d.sector_count==1)&&((d.coordination == coordinatedJointId)||(d.coordination == coordinatedHarmonizedId))){
			d.top.push('coordination_1');
		}
		if((d.sector_count>=2)&&((d.coordination == coordinatedJointId)||(d.coordination == coordinatedHarmonizedId))){
			d.top.push('coordination_2');
		}
		if((d.sector_count>=5)&&((d.coordination == coordinatedJointId)||(d.coordination == coordinatedHarmonizedId))){
			d.top.push('coordination_5');
		}
		if(d.coordination==coordinatedHarmonizedId){
			d.top.push('harmonized');
		}
		if(d.coordination==uncoordinatedId){
			d.top.push('uncoordinated');
		}
		if(d.sector_count>=5){
			d.top.push('sector_5');
		}
		if(d.sector_count>=2){
			d.top.push('sector_2');
		}
		if(d.sector_count==1){
			d.top.push('sector_1');
		}
		if((d.sector_count>=5)&&(d.assessment_type==atype_keys.monitoring)){
			d.top.push('monitoring_5');
		}
		if((d.sector_count>=2)&&(d.assessment_type==atype_keys.monitoring)){
			d.top.push('monitoring_2');
		}
		if((d.sector_count==1)&&(d.assessment_type==atype_keys.monitoring)){
			d.top.push('monitoring_1');
		}
		if(d.assessment_type==atype_keys.initial){
			d.top.push('initial');
		}
		if(d.assessment_type==atype_keys.rapid){
			d.top.push('rapid');
		}
		if(d.assessment_type==atype_keys.in_depth){
			d.top.push('in_depth');
		}
		if(d.data_collection_technique.includes(data_collection_technique_keys.focus_group_discussion)){
			d.top.push('focus_group_discussion');
		}
		if(d.data_collection_technique.includes(data_collection_technique_keys.key_informant_interview)){
			d.top.push('key_informant_interview');
		}
		if(d.data_collection_technique.includes(data_collection_technique_keys.community_group_discussion)){
			d.top.push('community_group_discussion');
		}
		// STAKEHOLDER TYPE
		if(d.stakeholder_type.includes(stakeholder_type_keys.donor)){
			d.top.push('donor');
		}
		if(d.stakeholder_type.includes(stakeholder_type_keys.ingo)){
			d.top.push('ingo');
		}
		if(d.stakeholder_type.includes(stakeholder_type_keys.lngo)){
			d.top.push('lngo');
		}
		if(d.stakeholder_type.includes(stakeholder_type_keys.government)){
			d.top.push('government');
		}
		if(d.stakeholder_type.includes(stakeholder_type_keys.un_agency)){
			d.top.push('un_agency');
		}
		if(d.stakeholder_type.includes(stakeholder_type_keys.rcrc)){
			d.top.push('rcrc');
		}
		if(d.stakeholder_type.includes(stakeholder_type_keys.cluster)){
			d.top.push('cluster');
		}

	});

	return data;

}

parseEntriesData = function(dataEntries, metadata){

	// convert date strings into js date objects
	dataEntries.forEach(function(d,i){
		d.date = new Date(d.date);
		d.date.setHours(0,0,0,0);
		d.month = new Date(d.date);
		d.month.setHours(0,0,0,0);
		d.month.setDate(1);
		d.year = new Date(d.date);
		d.year.setHours(0,0,0,0);
		d.year.setDate(1);
		d.year.setMonth(0);

		// PARSE STRING IDS TO INTEGERS
		// parse context array
		d._context = d.context;
		d.context = [];
		d._context.forEach(function(dd,ii){
			metadata.context_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					d.context.push(ddd.id);
				}
			});
		});
		// parse specific needs array
		d._special_needs = d.special_needs;
		d.special_needs = [];
		d._special_needs.forEach(function(dd,ii){
			metadata.specific_needs_groups_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					d.special_needs.push(ddd.id);
				}
			});
		});
		// parse affected groups array
		d._affected_groups = d.affected_groups;
		d.affected_groups = [];
		d._affected_groups.forEach(function(dd,ii){
			metadata.affected_groups_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					d.affected_groups.push(ddd.id);
				}
			});
		});
		// parse affected groups array
		d._sector = d.sector;
		d.sector = [];
		d._sector.forEach(function(dd,ii){
			var context_id = 0;
			metadata.context_array.forEach(function(ddd,ii){
				if(dd[0]==ddd._id){
					context_id = ddd.id;
				}
			});
			var framework_id = 0;
			metadata.framework_groups_array.forEach(function(ddd,ii){
				if(dd[1]==ddd._id){
					framework_id = ddd.id;
				}
			});
			var sector_id = 0;
			metadata.sector_array.forEach(function(ddd,ii){
				if(dd[2]==ddd._id){
					sector_id = ddd.id;
				}
			});
			d.sector.push([context_id,framework_id,sector_id]);
		});

		// parse severity id
		d._severity = d.severity;
		metadata.severity_units.forEach(function(ddd,ii){
			if(d._severity==ddd._id){
				d.severity = ddd.id;
			}
			// parse null values
			if(d._severity===null){
				d.severity = 0;
			}
		});
		
		// parse reliability id
		d._reliability = d.reliability;
		metadata.reliability_units.forEach(function(ddd,ii){
			if(d._reliability==ddd._id){
				d.reliability = ddd.id;
			}
			// parse null values
			if(d._reliability===null){
				d.reliability = 0;
			}
		});
		// parse geo id
		d._geo = d.geo;
		d.geo = [];

		d._geo.forEach(function(dd,ii){
			metadata.geo_array.forEach(function(ddd,ii){
				if(dd==ddd._id){
					if(!d.geo.includes(ddd.id)){d.geo.push(ddd.id);};
					geoBounds.lat.push(ddd.bounds[0][0]);
					geoBounds.lat.push(ddd.bounds[1][0]);
					geoBounds.lon.push(ddd.bounds[0][1]);
					geoBounds.lon.push(ddd.bounds[1][1]);
				}
			});
		});

	});

	return dataEntries;

}

parseEntriesMetadata = function(metadata){

	// parse meta data, create integer id column from string ids and programattically attempt to shorten label names
	metadata.context_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});
	metadata.framework_groups_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		d._context_id = d.context_id;
		// programattically shorten a long framework label
		if(d.name== "Status of essential infrastructure, systems, markets and networks"){
			d.name = "Infrastructure, systems, markets and networks";
		}
		metadata.context_array.forEach(function(ddd,ii){
			if(d._context_id==ddd._id){
				d.context_id = ddd.id;
			}
		});
	});
	metadata.affected_groups_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});
	metadata.specific_needs_groups_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});
	metadata.sector_array.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});
	metadata.severity_units.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
		// shorten label by cutting text after the first full-stop
		d.name = d.name.split('.')[0];
	});
	metadata.reliability_units.forEach(function(d,i){
		d._id = d.id;
		d.id = i+1;
	});
	metadata.severity_units.unshift({
		"id": 6,
		"color": "grey",
		"name": "Null",
		"_id": null,
	});
	metadata.reliability_units.unshift({
		"id": 6,
		"color": "grey",
		"name": "Null",
		"_id": null,
	});

	return metadata;
}

function getParent(geo_id){
	var parent;
	metadata.geo_array.forEach(function(d,i){
		if(geo_id==d.id){
			parent = d.parent;
		}
	})
	return parseInt(parent);
}